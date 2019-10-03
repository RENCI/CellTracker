import os
from tempfile import NamedTemporaryFile

from django.utils.deconstruct import deconstructible
from django.core.files.storage import Storage
from django.core.exceptions import ValidationError

from icommands import GLOBAL_SESSION, GLOBAL_ENVIRONMENT, SessionException


@deconstructible
class IrodsStorage(Storage):
    def __init__(self):
        self.session = GLOBAL_SESSION
        self.environment = GLOBAL_ENVIRONMENT

    def get_video(self, exp_id, dest_path):
        """
        Get the experiement video
        :param exp_id: experiment id
        :param dest_path: destination path on web server to retrieve video from iRODS to
        :return: the destination path that contains the retrieved video file
        """
        src_path = os.path.join(exp_id, 'data', 'video')
        self.session.run("iget", None, '-rf', src_path, dest_path)
        return dest_path

    def get_all_images(self, exp_id, dest_path):
        """
        Get all image sequences of an experiment
        :param exp_id: experiment id
        :param dest_path: destination path on web server to retrieve image sequences from iRODS to
        :return: the destination path that contains the retrieved image sequence files
        """
        src_path = os.path.join(exp_id, 'data', 'image')
        self.session.run("iget", None, '-rf', src_path, dest_path)
        return os.path.join(dest_path, 'image')

    def get_one_image_frame(self, exp_id, image_type, image_name, dest_path):
        """
        Get one image frame from an experiment.
        :param exp_id: experiment id
        :param image_type: type of the image, only 'png' and 'jpg' are supported
        :param image_name: name of the image to retrieve
        :param dest_path: destination path on web server to retrieve image from iRODS to
        :return: the image file name with full path
        """
        src_path = os.path.join(exp_id, 'data', 'image', image_type, image_name)

        self.session.run("iget", None, '-rf', src_path, dest_path)
        return dest_path

    def get_file(self, src_name, dest_name):
        self.session.run("iget", None, '-f', src_name, dest_name)

    def save_file(self, from_name, to_name, create_directory=False, data_type_str=''):
        """
        Parameters:
        :param
        from_name: the temporary file name in local disk to be uploaded from.
        to_name: the data object path in iRODS to be uploaded to
        create_directory: create directory as needed when set to True. Default is False
        Note if only directory needs to be created without saving a file, from_name should be empty
        and to_name should have "/" as the last character
        """
        if create_directory:
            splitstrs = to_name.rsplit('/', 1)
            if len(splitstrs) <= 1:
                return
            self.session.run("imkdir", None, '-p', splitstrs[0])

        if from_name:
            try:
                if data_type_str:
                    self.session.run("iput", None, '-D', data_type_str, '-f', from_name, to_name)
                else:
                    self.session.run("iput", None, '-f', from_name, to_name)
            except:
                if data_type_str:
                    self.session.run("iput", None, '-D', data_type_str, '-f', from_name, to_name)
                else:
                    # IRODS 4.0.2, sometimes iput fails on the first try.
                    # A second try seems to fix it.
                    self.session.run("iput", None, '-f', from_name, to_name)
        return

    def copy_file(self, src_name, dest_name, ires=None, create_dest_coll_as_needed=False):
        """
        copy an irods data-object (file) or collection (directory) to another data-object or collection
        Parameters:
        :param
        src_name: the iRODS data-object or collection name to be copied from.
        dest_name: the iRODS data-object or collection name to be copied to
        create_dest_coll_as_needed: optional indicating whether to create destination
        collection as needed. Default is False
        """

        if src_name and dest_name:
            if create_dest_coll_as_needed and '/' in dest_name:
                splitstrs = dest_name.rsplit('/', 1)
                if not self.exists(splitstrs[0]):
                    self.session.run("imkdir", None, '-p', splitstrs[0])
            if ires:
                self.session.run("icp", None, '-rf', '-R', ires, src_name, dest_name)
            else:
                self.session.run("icp", None, '-rf', src_name, dest_name)
        return

    def move_file(self, src_name, dest_name, create_dest_coll_as_needed=False):
        """
        Parameters:
        :param
        src_name: the iRODS data-object or collection name to be moved from.
        dest_name: the iRODS data-object or collection name to be moved to
        moveFile() moves/renames an irods data-object (file) or collection
        (directory) to another data-object or collection
        create_dest_coll_as_needed: optional indicating whether to create destination
        collection as needed. Default is False
        """
        if src_name and dest_name:
            if create_dest_coll_as_needed and '/' in dest_name:
                splitstrs = dest_name.rsplit('/', 1)
                if not self.exists(splitstrs[0]):
                    self.session.run("imkdir", None, '-p', splitstrs[0])
            self.session.run("imv", None, src_name, dest_name)
        return

    def _open(self, name, mode='rb'):
        tmp = NamedTemporaryFile()
        self.session.run("iget", None, '-f', name, tmp.name)
        return tmp

    def _save(self, name, content):
        self.session.run("imkdir", None, '-p', name.rsplit('/', 1)[0])
        with NamedTemporaryFile(delete=False) as f:
            for chunk in content.chunks():
                f.write(chunk)
            f.flush()
            f.close()
            try:
                self.session.run("iput", None, '-f', f.name, name)
            except:
                # IRODS 4.0.2, sometimes iput fails on the first try. A second try seems to fix it.
                self.session.run("iput", None, '-f', f.name, name)
            os.unlink(f.name)
        return name

    def delete(self, name):
        self.session.run("irm", None, "-rf", name)

    def exists(self, name):
        try:
            stdout = self.session.run("ils", None, name)[0]
            return stdout != ""
        except SessionException:
            return False

    def _list_files(self, path):
        """
        internal method to only list data objects/files under path
        :param path: iRODS collection/directory path
        :return: ordered filename_list
        """

        fname_list = []

        # the query below returns name of all data objects/files under the path collection/directory
        qrystr = "select DATA_NAME where DATA_REPL_STATUS != '0' AND " \
                 "COLL_NAME like '%{}'".format(path)
        stdout = self.session.run("iquest", None, "--no-page", "%s",
                                  qrystr)[0].split("\n")

        for i in range(len(stdout)):
            if not stdout[i] or "CAT_NO_ROWS_FOUND" in stdout[i]:
                break
            fname_list.append(stdout[i])

        return fname_list

    def _list_sub_dirs(self, path):
        """
        internal method to only list sub-collections/sub-directories under path
        :param path: iRODS collection/directory path
        :return: sub-collection/directory name list
        """
        subdir_list = []
        # the query below returns name of all sub-collections/sub-directories
        # under the path collection/directory
        qrystr = "select COLL_NAME where COLL_PARENT_NAME like '%{}'".format(path)
        stdout = self.session.run("iquest", None, "--no-page", "%s",
                                  qrystr)[0].split("\n")
        for i in range(len(stdout)):
            if not stdout[i] or "CAT_NO_ROWS_FOUND" in stdout[i]:
                break
            dirname = stdout[i]
            # remove absolute path prefix to only show relative sub-dir name
            idx = dirname.find(path)
            if idx > 0:
                dirname = dirname[idx + len(path) + 1:]

            subdir_list.append(dirname)

        return subdir_list

    def listdir(self, path):
        """
        return list of sub-collections/sub-directories and data objects/files
        :param path: iRODS collection/directory path
        :return: (sub_directory_list, file_name_list)
        """
        # remove any trailing slashes if any; otherwise, iquest would fail
        path = path.strip()
        while path.endswith('/'):
            path = path[:-1]

        # check first whether the path is an iRODS collection/directory or not, and if not, need
        # to raise SessionException, and if yes, can proceed to get files and sub-dirs under it
        qrystr = "select COLL_NAME where COLL_NAME like '%{}'".format(path)
        stdout = self.session.run("iquest", None, "%s", qrystr)[0]
        if "CAT_NO_ROWS_FOUND" in stdout:
            raise SessionException(-1, '', 'folder {} does not exist'.format(path))

        fname_list = self._list_files(path)

        subdir_list = self._list_sub_dirs(path)

        listing = (subdir_list, fname_list)

        return listing

    def size(self, name):
        """
        return the size of the data object/file with file name being passed in
        :param name: file name
        :return: the size of the file
        """
        file_info = name.rsplit('/', 1)
        if len(file_info) < 2:
            raise ValidationError('{} is not a valid file path to retrieve file size '
                                  'from iRODS'.format(name))
        coll_name = file_info[0]
        file_name = file_info[1]
        qrystr = "select DATA_SIZE where DATA_REPL_STATUS != '0' AND " \
                 "COLL_NAME like '%{}' AND DATA_NAME = '{}'".format(coll_name, file_name)
        stdout = self.session.run("iquest", None, "%s", qrystr)[0]

        if "CAT_NO_ROWS_FOUND" in stdout:
            raise ValidationError("{} cannot be found in iRODS to retrieve "
                                  "file size".format(name))
        return int(stdout)


        stdout = self.session.run("ils", None, "-l", name)[0].split()
        return int(stdout[3])

    def get_available_name(self, name):
        """
        Reject duplicate file names rather than renaming them.
        """
        if self.exists(name):
            raise ValidationError(str.format("File {} already exists.", name))
        return name

    def get_sorted_exp_list(self):
        qrystr = "select COLL_NAME, order_desc(META_COLL_ATTR_VALUE) where " \
                 "META_COLL_ATTR_NAME = 'priority'"
        stdout = self.session.run("iquest", None, "--no-page", "%s %s",
                                  qrystr)[0].split("\n")
        exp_lst = []
        for i in range(len(stdout)):
            if not stdout[i] or "CAT_NO_ROWS_FOUND" in stdout[i]:
                break
            coll_path = stdout[i].split()[0]
            exp_id = coll_path.rsplit('/', 1)[1]
            exp_lst.append(exp_id)

        return exp_lst
